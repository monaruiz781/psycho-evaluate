import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPsychoEvaluate = await deploy("PsychoEvaluate", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`PsychoEvaluate contract: `, deployedPsychoEvaluate.address);
};
export default func;
func.id = "deploy_psychoEvaluate"; // id required to prevent reexecution
func.tags = ["PsychoEvaluate"];

